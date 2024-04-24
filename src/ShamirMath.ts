import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature} from "./Utils";
import { BashRunner } from "./BashRunner";
import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

export class ShamirMath {
    constructor(){
    }

    /**
     * Creates shares of Ki = P(id) for each coalition member
     */
    static async create_sig_part_i(coalition : Coalition) : Promise<SigPartI>{
        log.debug(`ShamirMath::create_sig_part_i(${JSON.stringify(coalition)})`);        
        let sig_part_i : SigPartI;
        let cmd : string = `sage ~/sig_part_i.sage ${coalition.members.join(" ")}`;
        log.verbose(`ShamirMath::create_sig_part_i - running cmd '${cmd}'`);
        let stdout = await BashRunner.run(cmd);
        console.log(stdout);
        return sig_part_i;
    }

    static async create_sig_part_ii(sigs_i : Array<SigPartI>) : Promise<SigPartII>{
        let sig_part_ii : SigPartII;
        return sig_part_ii;
    }

    static async create_signature(sigs_ii : Array<SigPartII>) : Promise<Signature>{
        let sign : Signature;
        return sign;
    }
}