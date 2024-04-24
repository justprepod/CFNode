import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, calculate_object_hash, AckData} from "./Utils";

export interface Connector {
    read_lock(lock_info : LockInfo) : Promise<LockData>;
    
    send_acknowledgment(lock_info : LockInfo, ack_data : AckData);

    read_acknowledments(lock_info : LockInfo) : Promise<Coalition>;

    send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI);

    read_sigs_i(lock_info : LockInfo) : Promise<Array<SigPartI>>;

    send_sig_part_ii(lock_info : LockInfo, sig_part_i : SigPartII);

    read_sigs_ii(lock_info : LockInfo) : Promise<Array<SigPartII>>;
}