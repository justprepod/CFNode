import { EthereumConnector } from "./EthereumConnector";
import { Connector } from "./Connector";
import {createHash} from 'crypto';
import {Logger, create_logger } from './Logger';
import { Bytes } from "web3";


let log : any = create_logger('silly');

export interface SecretShare {
    value : string;
}

export type EthereumAddress = string;

export interface EtherConfig{
    __type : "EtherConfig";
    network_id : number;
    rpc : string;
    vault_address : EthereumAddress;
    iface? : Connector;
}

export interface StubConfig{
    __type : "StubConfig";
    network_id : number;
    filename : string;
    vault_address : string;
    iface? : Connector;
}

export interface ZanoConfig{
    __type : "ZanoConfig";
    network_id : number;
    rpc : string;
    vault_address : EthereumAddress;
    iface? : Connector;
}

export interface AckData {
    hash : string,
    id : string;
}

export interface CFNetworkConfig{
    __type : string;
    rpc : string;
    storage_address : EthereumAddress;
    threshold : number;
    secret_share : SecretShare;
    node_id : string;
}

export type NetworkConfig = Array<EtherConfig | ZanoConfig | StubConfig>;

export interface AppConfig{
    networks : Array<EtherConfig | ZanoConfig | StubConfig>;
    cf_network: CFNetworkConfig;
}

export class Hash {
    private _value : string;

    constructor(_ : string | Bytes){
        this.hex = _;
    }

    public set hex(_ : string | Bytes){
        if (typeof _ === 'string'){
            log.assert(/^(0x)?[0-9a-fA-F]{64}$/.test(_), `_ must be 64-character hexadecimal value, not '${_}'`);
            this._value = _;
        } else if (typeof _ === 'number'){
        } else {
            throw `Bad type of _ - ${typeof _}`;
        }
    }

    public get hex() : string{
        return this._value;
    }
};

export interface Signature{
    r : string;
    s : string;
}

export class Transaction{
    private _from : string;
    private _to : string;
    private _asset : string;
    private _amount : string;

    public get from() : string{
        return this._from;
    }

    public get to() : string{
        return this._to;
    }

    public get asset() : string{
        return this._asset;
    }

    public get amount() : string{
        return this._amount;
    }

    constructor(_ : {from : string, to : string, asset : string, amount : string}){
        log.silly(`Transaction::constuctor(${JSON.stringify(_)})`);
        this._amount = _.amount;
        this._from = _.from;
        this._to = _.to;
        this._asset = _.asset;
    }

    public json() : object{
        return {from:this._from, to:this._to, asset: this._asset, amount: this._amount};
    }

    public hash() : Hash{
        return calculate_object_hash(this.json());
    }
}

export interface SigShare{
    from : string;
    to : string;
    share : string;
}

export interface SigPartI{
    tx_hash : string;
    node_id : string;
    shares : Array<SigShare>;
}

export interface SigPartII{
    node_id : string;
    share : string;
}

export interface Coalition{
    members : Array<string>;
}

export class LockData{
    private _from : string;
    private _to : string;
    private _asset : string;
    private _amount : string;
    private _src_network_id : number;
    private _dst_network_id : number;

    public get from() : string{
        return this._from;
    }

    public get to() : string{
        return this._to;
    }

    public get asset() : string{
        return this._asset;
    }

    public get amount() : string{
        return this._amount;
    }

    public get src_network_id() : number{
        return this._src_network_id;
    }

    public get dst_network_id() : number{
        return this._dst_network_id;
    }

    constructor(_:{from : string, to : string, asset : string, amount : string, src_network_id : number, dst_network_id : number}){
        log.silly(`LockData::constuctor(${JSON.stringify(_)})`);
        log.assert(typeof _.from === 'string', `Bad type of from, ${_.from} type must be string, not ${typeof _.from}`);
        log.assert(typeof _.to === 'string', `Bad type of to, ${_.to} type must be string, not ${typeof _.to}`);
        log.assert(typeof _.asset === 'string', `Bad type of asset, ${_.asset} type must be string, not ${typeof _.asset}`);
        log.assert(typeof _.amount === 'string', `Bad type of amount, ${_.amount} type must be string, not ${typeof _.amount}`);
        log.assert(typeof _.src_network_id === 'number', `Bad type of src_network, ${_.src_network_id} type must be number, not ${typeof _.src_network_id}`);
        log.assert(typeof _.dst_network_id === 'number', `Bad type of dst_network, ${_.dst_network_id} type must be number, not ${typeof _.dst_network_id}`);

        this._from = _.from;
        this._to = _.to;
        this._amount = _.amount;
        this._asset = _.asset;
        this._src_network_id = _.src_network_id;
        this._dst_network_id = _.dst_network_id;
    }
}

export interface LockInfo{
    network_id : number;
    tx_hash : Hash;
}

export interface TokenMatchInfo{
    src_network : number;
    src_hash : string;
    src_decimals : number;
    dst_network : number;
    dst_hash : string;
    dst_decimals : number;
}
export function calculate_object_hash(obj) : Hash {
    //TODO: correct fields hashing
    const hash = createHash('sha256');
    hash.update(JSON.stringify(obj));
    return new Hash(hash.digest('hex'));
}
