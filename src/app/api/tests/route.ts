import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { execSsh } from '@/lib/ssh';

export async function POST(req: Request) {
    try {
        const { sourceNodeId, targetNodeId, testType } = await req.json();

        if (!sourceNodeId) return NextResponse.json({ error: 'Source node is required' }, { status: 400 });

        const sourceNode = await prisma.node.findUnique({ where: { id: sourceNodeId } });
        const targetNode = targetNodeId ? await prisma.node.findUnique({ where: { id: targetNodeId } }) : null;

        if (!sourceNode) return NextResponse.json({ error: 'Source node not found' }, { status: 404 });

        let output = '';

        try {
            if (testType === 'ping') {
                const targetIp = targetNode ? targetNode.ip : '1.1.1.1'; // Default to internet ping if no target
                output = await execSsh(
                    sourceNode.ip, sourceNode.port, sourceNode.username, sourceNode.password || undefined, undefined,
                    `ping -c 4 ${targetIp}`
                );
            } else if (testType === 'iperf3') {
                if (!targetNode) return NextResponse.json({ error: 'Target node is required for iperf3' }, { status: 400 });

                // Start server in daemon mode on target
                await execSsh(
                    targetNode.ip, targetNode.port, targetNode.username, targetNode.password || undefined, undefined,
                    `iperf3 -s -D || true`
                );

                // Run client on source
                output = await execSsh(
                    sourceNode.ip, sourceNode.port, sourceNode.username, sourceNode.password || undefined, undefined,
                    `iperf3 -c ${targetNode.ip} -t 5`
                );
            } else {
                return NextResponse.json({ error: 'Unknown test type' }, { status: 400 });
            }

            return NextResponse.json({ success: true, output });
        } catch (sshErr: any) {
            console.error(`SSH Execution Error for ${testType}:`, sshErr);
            return NextResponse.json({ error: `Command failed on remote server. Make sure it's installed.` }, { status: 500 });
        }
    } catch (err) {
        console.error('Test error:', err);
        return NextResponse.json({ error: 'Internal server error while configuring test' }, { status: 500 });
    }
}
