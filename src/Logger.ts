import { createLogger, transports, format, Logger } from "winston";
export {Logger} from "winston";

BigInt.prototype["toJSON"] = function () {
    return this.toString();
  };

export function create_logger(loglevel : string) : Logger{
    let logger : any;
    logger = createLogger({
        level:loglevel,
        transports: [new transports.Console()],
        format: format.combine(
            format.colorize(),
            format.timestamp(),
            format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
            })
        ),
    });

    logger.assert = function(condidion : boolean, msg : string){
        if (!condidion){
            this.error(`ASSERTION FAILED: ${msg}`);
            console.trace(msg);
            process.exit(1);
        }
    }
    
    return logger;
}