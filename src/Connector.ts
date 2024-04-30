import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, AckData, SigShare} from "./Utils";

export interface Connector {
    send_lock(tx : Transaction, sk : string);

    read_lock(lock_info : LockInfo) : Promise<LockData>;

    send_acknowledgment(ack_data : AckData) : Promise<boolean>;

    read_acknowledments(hash : Hash) : Promise<Coalition>;

    send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI);

    read_sigs_i(hash : Hash, node_id : string) : Promise<Array<SigShare>>;

    send_sig_part_ii(lock_info : LockInfo, sig_part_i : SigPartII);

    read_sigs_ii(hash : Hash, node_id : string) : Promise<Array<SigPartII>>;
}