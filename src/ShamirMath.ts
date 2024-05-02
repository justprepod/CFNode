import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, SigShare} from "./Utils";
import { BashRunner } from "./BashRunner";
import { signMessage } from "./ecdsa";
import RLP from "rlp";
import {Web3}  from "web3";


import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

export class ShamirMath {
    constructor(){
    }

    static async ether_raw_sig({nonce,gasPrice, gasLimit, to, value, data}, pk){
        log.debug(`ShamirMath::ether_raw_sig()`);

        let web3 = new Web3();

        let encoded = RLP.encode([nonce, gasPrice, gasLimit, to, value, data]);

        let hash_origin = "0x" + web3.utils.sha3(encoded);

        let sign_encoded = signMessage(hash_origin, pk);
        let v = 27;

        let signed_transaction = RLP.encode([
            nonce,
            gasPrice,
            gasLimit,
            to,
            value,
            data,
            "0x" + v.toString(16),
            sign_encoded.r,
            sign_encoded.s,
        ]);

        return signed_transaction;
    }

    /**
     * Creates shares of Ki = P(id) for each coalition member
     */
    static async create_sig_part_i(tx_hash : Hash, node_id : string, coalition : Coalition) : Promise<SigPartI>{
        log.verbose(`ShamirMath::create_sig_part_i(${tx_hash.hex}, ${node_id}, ${JSON.stringify(coalition)})`);        
        let sig_part_i : SigPartI;
        let cmd : string = `sage ~/sig_part_i.sage ${coalition.members.join(" ")}`;
        log.silly(`ShamirMath::create_sig_part_i - running cmd '${cmd}'`);
        let stdout = await BashRunner.run(cmd);

        log.debug(`ShamirMath::create_sig_part_i - parsing ${stdout.trim()} result of sagemath`);        

        let raw_shares =  JSON.parse(stdout);

        if (Array.isArray(raw_shares)){
            if (raw_shares.length === coalition.members.length){
                let shares : Array<SigShare> = [];

                for (let i = 0; i < raw_shares.length; i++){
                    shares.push({from: node_id, to: coalition.members[i], share: raw_shares[i]});
                };

                sig_part_i = {tx_hash: tx_hash.hex, node_id, shares};
            } else {
                throw `ShamirMath::create_sig_part_i - bad size of '${stdout}' - ${coalition.members.length} expected`;
            }
        } else {
            throw `ShamirMath::create_sig_part_i - external script returned bad result '${stdout}' - array of strings expected`;
        }

        return sig_part_i;
    }

    static async create_sig_part_ii(node_id : string, sigs_i : Array<SigShare>) : Promise<SigPartII>{
        log.verbose(`ShamirMath::create_sig_part_ii(${JSON.stringify(sigs_i)})`);
        let sig_part_ii : SigPartII;

        let cmd : string = `sage ~/sig_part_ii.sage ${sigs_i.join(" ")}`;
        log.silly(`ShamirMath::create_sig_part_ii - running cmd '${cmd}'`);
        let stdout = await BashRunner.run(cmd);

        log.debug(`ShamirMath::create_sig_part_ii - parsing ${stdout.trim()} result of sagemath`);

        let raw_share = JSON.parse(stdout);

        if (typeof raw_share == 'object'){
            sig_part_ii = {node_id, share: raw_share.value};
        } else {
            throw `ShamirMath::create_sig_part_ii - external script returned bad result '${stdout}' - string expected`;
        }

        return sig_part_ii;
    }

    static async create_signature(sigs_ii : Array<SigPartII>) : Promise<Signature>{
        let sign : Signature = {r : "", s : ""};
        return sign;
    }
}