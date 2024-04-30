import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BashRunner{
    static async run(cmd : string) : Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(cmd);
           
            if (stderr) {
                throw new Error(stderr);
            }

            return stdout;
        } catch (error) {
            console.error('Error executing command', error);
            return undefined;
        }
    }
}