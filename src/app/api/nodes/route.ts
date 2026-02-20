import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testSshConnection, execSsh } from '@/lib/ssh';
export async function GET() {
    try {
        const nodes = await prisma.node.findMany({
            select: {
                id: true,
                name: true,
                ip: true,
                port: true,
                username: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, nodes });
    } catch (err) {
        console.error('Fetch nodes error:', err);
        return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, ip, port, username, password } = body;

        // Validate input
        if (!name || !ip || !port || !username || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify SSH Connection before saving
        const isConnected = await testSshConnection(ip, port, username, password);
        if (!isConnected) {
            return NextResponse.json({ error: 'SSH Connection Failed. Check credentials, IP, and Port.' }, { status: 400 });
        }

        // Save to DB
        const node = await prisma.node.create({
            data: { name, ip, port, username, password },
            select: { id: true, name: true, ip: true, port: true, username: true } // Don't return password
        });

        return NextResponse.json({ success: true, node });
    } catch (err) {
        console.error('Create node error:', err);
        return NextResponse.json({ error: 'Failed to create node. IP might already exist or internal error.' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing node ID' }, { status: 400 });

        const node = await prisma.node.findUnique({ where: { id } });
        if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

        // Fetch all tunnels involving this node
        const tunnels = await prisma.tunnel.findMany({
            where: {
                OR: [{ localNodeId: id }, { remoteNodeId: id }]
            },
            include: { localNode: true, remoteNode: true }
        });

        // Teardown each tunnel on both local and remote ends
        for (const tunnel of tunnels) {
            if (tunnel.name && (tunnel.name.startsWith('gre') || tunnel.name.startsWith('vxlan'))) {
                try {
                    const cmdLocal = `ip link delete ${tunnel.name}`;
                    const cmdRemote = `ip link delete ${tunnel.name}`;
                    await Promise.allSettled([
                        execSsh(tunnel.localNode.ip, tunnel.localNode.port, tunnel.localNode.username, tunnel.localNode.password || undefined, undefined, cmdLocal),
                        execSsh(tunnel.remoteNode.ip, tunnel.remoteNode.port, tunnel.remoteNode.username, tunnel.remoteNode.password || undefined, undefined, cmdRemote)
                    ]);
                } catch (ignore) { }
            }
        }

        await prisma.node.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete node error:', err);
        return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
    }
}
