import { getCustomRepository, getRepository, In } from "typeorm";
import fs from 'fs';
import csvParse, { Parser } from "csv-parse";

import Transaction from '../models/Transaction';
import Category from "../models/Category";
import TransactionsRepository from "../repositories/TransactionsRepository";

interface RequestDTO {
	filePath: string;
}

interface CSVTransaction {
	title: string;
	type: 'income' | 'outcome';
	value: number;
	category: string;
}

interface ImportedData {
	transactions: CSVTransaction[],
	categories: string[]
}

class ImportTransactionsService {
	private transactionsRepository = getCustomRepository(TransactionsRepository)
	private categoriesRepository = getRepository(Category)

	async execute({filePath}: RequestDTO): Promise<Transaction[]> {
		const parseCSV = await this.getCSVParser(filePath);
		const {transactions, categories} = await this.asyncReadTransactions(parseCSV);

		const finalCategories = await this.saveNewCategories(categories);
		const savedTransactions = await this.saveNewTransactions(transactions, finalCategories)

		await this.deleteImportedFile(filePath)

		return savedTransactions
	}

	private async getCSVParser(filePath: string): Promise<Parser> {
		const readStream = await fs.createReadStream(filePath)

		const csvParser = csvParse({
			from_line: 2,
			ltrim: true,
			rtrim: true
		})

		return readStream.pipe(csvParser)
	}

	private async asyncReadTransactions(
		parseCSV: Parser
	): Promise<ImportedData> {

		const transactions: CSVTransaction[] = []
		const categories: string[] = []

		parseCSV.on('data', async row => {
			const [title, type, value, category] = row

			if (!title || !type || !value) return

			transactions.push({title, type, value, category})
			categories.push(category)
		})

		await new Promise(resolve => parseCSV.on('end', resolve))

		return {transactions, categories}
	}

	private async saveNewCategories(categories: string[]): Promise<Category[]> {

		// Searches for categories in database with the same title of the imported categories
		const existentCategories = await this.categoriesRepository.find({
			where: {
				title: In(categories)
			},
		})

		// Transforms the Categories[] into a string[]
		const existentCategoriesTitles = existentCategories.map((category: Category) => category.title)

		// Filters all the imported categories, removing the already existent ones,
		// and transforms the string[] into a { title: string }[]
		const categoriesToBeAdded = categories
			.filter((category: string, index: number, self: string[]) =>
				!existentCategoriesTitles.includes(category) && self.indexOf(category) === index)
			.map((category: string) => ({title: category}))

		// Creates multiple instances of Category
		const newCategories = this.categoriesRepository.create(categoriesToBeAdded)

		// Saves all the new categories at once
		await this.categoriesRepository.save(newCategories)

		return [...existentCategories, ...newCategories]
	}

	private async saveNewTransactions(
		transactions: CSVTransaction[],
		finalCategories: Category[]
	): Promise<Transaction[]> {

		// Transforms the CSVTransaction[] into a Transaction[] by
		// changing the categoryTitle for its equivalent instance of Category
		const transactionsToBeAdded = transactions.map(
			({title, type, value, category: categoryTitle}: CSVTransaction) => ({
				title,
				type,
				value,
				category: finalCategories.find((category: Category) => category.title === categoryTitle)
			})
		)

		// Creates and saves all the Transaction instances at once
		const newTransactions = this.transactionsRepository.create(transactionsToBeAdded)
		await this.transactionsRepository.save(newTransactions)

		return newTransactions
	}

	private async deleteImportedFile(filePath: string) {
		await fs.promises.unlink(filePath)
	}
}

export default ImportTransactionsService;
