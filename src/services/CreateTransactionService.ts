import Transaction from '../models/Transaction';
import { getCustomRepository, getRepository } from "typeorm";
import TransactionsRepository from "../repositories/TransactionsRepository";
import AppError from "../errors/AppError";
import Category from "../models/Category";

interface RequestDTO {
	title: string;
	value: number;
	type: string;
	categoryTitle: string
}

class CreateTransactionService {
	public async execute({ title, value, type, categoryTitle }: RequestDTO): Promise<Transaction> {
		const transactionsRepository = getCustomRepository(TransactionsRepository)

		if (type != 'income' && type != 'outcome') {
			throw new AppError('Type not valid. Transactions\' types must be "income" or "outcome"')
		} else if (type == 'outcome') {
			const { total } = await transactionsRepository.getBalance();

			if (value > total) {
				throw new AppError(
					"You don't have enough cash for this transaction. " +
					`Your current cash is R$ ${total.toFixed(2)}`
				)
			}
		}

		const categoriesRepository = getRepository(Category)
		let category = await categoriesRepository.findOne({ title: categoryTitle })

		if (!category) {
			category = categoriesRepository.create({ title: categoryTitle })
			await categoriesRepository.save(category)
		}
		const transaction = transactionsRepository.create({
			title,
			value,
			type,
			category
		})

		await transactionsRepository.save(transaction)

		return transaction;
	}
}

export default CreateTransactionService;
