import { Router } from 'express';
import multer from "multer";

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';
import { getCustomRepository } from "typeorm";
import uploadConfig from "../config/upload";

const transactionsRouter = Router();
const upload = multer(uploadConfig)

transactionsRouter.get('/', async (request, response) => {
	const transactionsRepository = getCustomRepository(TransactionsRepository);
	const { transactions, balance } = await transactionsRepository.getAll();
	return response.json({ transactions, balance })
});

/**
 * A rota deve receber title, value, type, e category dentro do corpo da requisição, sendo o type
 * o tipo da transação, que deve ser income para entradas (depósitos) e outcome para saídas (retiradas).
 * Ao cadastrar uma nova transação, ela deve ser armazenada dentro do seu banco de dados, possuindo os campos
 * id, title, value, type, category_id, created_at, updated_at
 */
transactionsRouter.post('/', async (request, response) => {
	const { title, value, type, category } = request.body;
	const typeToLower = type.toLowerCase();
	const valueToNumber = Number.parseFloat(value);

	const createTransactionService = new CreateTransactionService();

	const repository = await createTransactionService.execute({
		title,
		value: valueToNumber,
		type: typeToLower,
		categoryTitle: category
	});

	return response.json(repository);
});

transactionsRouter.delete('/:id', async (request, response) => {
	const { id } = request.params
	const deleteTransactionService = new DeleteTransactionService()
	await deleteTransactionService.execute({ transactionId: id })
	return response.status(204).send()
});

transactionsRouter.post('/import', upload.single('file'), async (request, response) => {
	const importTransactionsService = new ImportTransactionsService();

	const transactions = await importTransactionsService.execute({
		filePath: request.file.path,
	})

	return response.json(transactions)
});

export default transactionsRouter;
