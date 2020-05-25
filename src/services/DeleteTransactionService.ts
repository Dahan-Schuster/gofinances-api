import AppError from '../errors/AppError';
import { getCustomRepository } from "typeorm";
import TransactionsRepository from "../repositories/TransactionsRepository";

interface RequestDTO {
	transactionId: string;
}

class DeleteTransactionService {
	public async execute({ transactionId }: RequestDTO): Promise<void> {
		const transactionsRepository = getCustomRepository(TransactionsRepository)

		const transaction = await transactionsRepository.findOne(transactionId)
		if (!transaction) {
			throw new AppError('Transaction not found', 404)
		}

		await transactionsRepository.delete(transactionId)
	}
}

export default DeleteTransactionService;
