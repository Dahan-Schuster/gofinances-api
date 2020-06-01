import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
	income: number;
	outcome: number;
	total: number;
}

interface Transactions {
	transactions: Transaction[];
	balance: Balance;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
	public async getBalance(transactions?: Transaction[]): Promise<Balance> {
		// eslint-disable-next-line no-param-reassign
		if (!transactions) transactions = await this.find();

		let income = 0;
		let outcome = 0;
		transactions.forEach(transaction => {
			if (transaction.type === 'income') {
				income += Number.parseFloat(String(transaction.value));
			} else {
				outcome += Number.parseFloat(String(transaction.value));
			}
		});

		const total = income - outcome;

		return {
			income,
			outcome,
			total,
		};
	}

	public async getAll(): Promise<Transactions> {
		const transactions = await this.find();
		const balance = await this.getBalance(transactions);

		return {
			transactions,
			balance,
		};
	}
}

export default TransactionsRepository;
