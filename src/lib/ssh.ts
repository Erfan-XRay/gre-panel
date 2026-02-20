import { Client } from 'ssh2';

export async function testSshConnection(host: string, port: number, username: string, password?: string, privateKey?: string): Promise<boolean> {
    return new Promise((resolve) => {
        const conn = new Client();

        conn.on('ready', () => {
            conn.end();
            resolve(true);
        }).on('error', (err) => {
            console.error('SSH Connection Error:', err);
            resolve(false);
        }).connect({
            host,
            port,
            username,
            password: password || undefined,
            privateKey: privateKey || undefined,
            readyTimeout: 10000 // 10 seconds timeout
        });
    });
}

export async function execSsh(host: string, port: number, username: string, password?: string, privateKey?: string, command: string = 'echo "connected"'): Promise<string> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        let output = '';

        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                stream.on('close', (code: number, signal: string) => {
                    conn.end();
                    resolve(output);
                }).on('data', (data: Buffer) => {
                    output += data.toString();
                }).stderr.on('data', (data: Buffer) => {
                    output += data.toString();
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host,
            port,
            username,
            password: password || undefined,
            privateKey: privateKey || undefined,
            readyTimeout: 10000
        });
    });
}
