import {Web3}  from "web3";
import {Connector} from "./Connector";
import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, AckData, SigShare} from "./Utils";
import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

let erc20_abi = [{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"uint256","name":"_decimals","type":"uint256"},{"internalType":"uint256","name":"_totalSupply","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_owner","type":"address"},{"indexed":true,"internalType":"address","name":"_spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_from","type":"address"},{"indexed":true,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_spender","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

let tranfer_topic = [
				{
					indexed: true,
					internalType: "address",
					name: "_from",
					type: "address"
				},
				{
					indexed: true,
					internalType: "address",
					name: "_to",
					type: "address"
				},
				{
					indexed: false,
					internalType: "uint256",
					name: "_value",
					type: "uint256"
				}
			];

export class EthereumConnector implements Connector {
    web3 : Web3;

    constructor (rpc : string){        
        log.info(`EthereumConnector::constructor(${rpc})`);
        this.web3 = new Web3(new Web3.providers.HttpProvider(rpc));
    }

    async send_lock(tx : Transaction, sk : string){
        log.debug(`EthereumConnector::send_lock(${JSON.stringify(tx)}, *****)`);

		try{
			let erc20_contract = new this.web3.eth.Contract(erc20_abi, tx.asset);

			let gas_price = await this.web3.eth.getGasPrice();

			let tx_json = {
				from: tx.from,
				to: tx.asset,
				gas: this.web3.utils.toHex(200000),
				gasPrice: this.web3.utils.toHex(gas_price),
				value: "0x00",
				data: erc20_contract.methods.transfer(tx.to, this.web3.utils.toHex(tx.amount)).encodeABI()
			};

			log.silly(`EthereumConnector::send_lock - tx_json = ${JSON.stringify(tx_json)}`);

			let signed_tx = await this.web3.eth.accounts.signTransaction(tx_json, sk);

			let receipt = await this.web3.eth.sendSignedTransaction(signed_tx.rawTransaction);

			log.silly(`EthereumConnector::send_lock - receipt = ${JSON.stringify(receipt)}`);
			log.info(`EthereumConnector::send_lock - receipt.transactionHash = ${JSON.stringify(receipt.transactionHash)}`);
			return new Hash(receipt.transactionHash);
		} catch(e){
			log.warn(`EthereumConnector::send_lock - failed`);
			return undefined;
		}
    }

    async read_lock(lock_info : LockInfo) : Promise<LockData> {
        log.debug(`EthereumConnector::read_lock(${JSON.stringify(lock_info)})`);

		try {
			let receipt = await this.web3.eth.getTransactionReceipt(lock_info.tx_hash.hex);

			log.silly(`EthereumConnector::read_lock - receipt = ${JSON.stringify(receipt)}`);

			let from = receipt.from;
			let to = this.web3.eth.abi.decodeParameter("address", receipt.logs[0].topics[2].toString()).toString();
			let amount = this.web3.utils.toBigInt(receipt.logs[0].data).toString();
			let asset = receipt.logs[0].address;
			let src_network_id = 0;
			let dst_network_id = 1;

			let lock_data : LockData = new LockData({from, to, amount, asset, src_network_id, dst_network_id});

			log.info(`EthereumConnector::read_lock - lock_data = ${JSON.stringify(lock_data)}`);
			return lock_data;
		} catch (e){
			log.warn(`EthereumConnector::read_lock - failed ${e.toString()}`);
			return undefined;
		}
    }

    async send_acknowledgment(ack_data : AckData) : Promise<boolean>{
        throw "Not implemented";
    }

    async read_acknowledments(hash : Hash) : Promise<Coalition>{
        throw "Not implemented";
    }

    async send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI){
		//${JSON.stringify(lock_info)},
        throw "Not implemented";
    }

    async read_sigs_i(hash : Hash) : Promise<Array<SigShare>>{
        throw "Not implemented";
    }

    async send_sig_part_ii(lock_info : LockInfo, sig_part_i : SigPartII){
        throw "Not implemented";
    }    

    async read_sigs_ii(hash : Hash) : Promise<Array<SigPartII>>{
        throw "Not implemented";
    }
}