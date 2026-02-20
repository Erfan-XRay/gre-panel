import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { execSsh } from '@/lib/ssh';

export async function GET() {
    try {
        const tunnels = await prisma.tunnel.findMany({
            include: {
                localNode: { select: { id: true, name: true, ip: true, port: true } },
                remoteNode: { select: { id: true, name: true, ip: true, port: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, tunnels });
    } catch (err) {
        console.error('Fetch tunnels error:', err);
        return NextResponse.json({ error: 'Failed to fetch tunnels' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, type, localNodeId, remoteNodeId, localIp, remoteIp } = await req.json();

        if (!localNodeId || !remoteNodeId || !localIp || !remoteIp) {
            return NextResponse.json({ error: 'Missing required tunnel configuration' }, { status: 400 });
        }

        // Get Node details (with passwords)
        const localNode = await prisma.node.findUnique({ where: { id: localNodeId } });
        const remoteNode = await prisma.node.findUnique({ where: { id: remoteNodeId } });

        if (!localNode || !remoteNode) {
            return NextResponse.json({ error: 'One or both nodes not found' }, { status: 404 });
        }

        const tunnelName = `${type}t${Math.floor(Math.random() * 1000)}`;

        try {
            if (type === 'gre') {
                const cmdLocal = `ip tunnel add ${tunnelName} mode gre remote ${remoteNode.ip} local ${localNode.ip} ttl 255 && ip link set ${tunnelName} up && ip addr add ${localIp}/30 dev ${tunnelName}`;
                const cmdRemote = `ip tunnel add ${tunnelName} mode gre remote ${localNode.ip} local ${remoteNode.ip} ttl 255 && ip link set ${tunnelName} up && ip addr add ${remoteIp}/30 dev ${tunnelName}`;

                await Promise.all([
                    execSsh(localNode.ip, localNode.port, localNode.username, localNode.password || undefined, undefined, cmdLocal),
                    execSsh(remoteNode.ip, remoteNode.port, remoteNode.username, remoteNode.password || undefined, undefined, cmdRemote)
                ]);
            } else if (type === 'vxlan') {
                // Simple VXLAN setup (VNI 100)
                const vni = Math.floor(Math.random() * 10000) + 100;
                const cmdLocal = `ip link add ${tunnelName} type vxlan id ${vni} remote ${remoteNode.ip} local ${localNode.ip} dstport 4789 && ip link set ${tunnelName} up && ip addr add ${localIp}/24 dev ${tunnelName}`;
                const cmdRemote = `ip link add ${tunnelName} type vxlan id ${vni} remote ${localNode.ip} local ${remoteNode.ip} dstport 4789 && ip link set ${tunnelName} up && ip addr add ${remoteIp}/24 dev ${tunnelName}`;

                await Promise.all([
                    execSsh(localNode.ip, localNode.port, localNode.username, localNode.password || undefined, undefined, cmdLocal),
                    execSsh(remoteNode.ip, remoteNode.port, remoteNode.username, remoteNode.password || undefined, undefined, cmdRemote)
                ]);
            } else {
                return NextResponse.json({ error: 'Unsupported tunnel type' }, { status: 400 });
            }
        } catch (sshErr: any) {
            console.error('SSH Tunnel Creation Error:', sshErr);
            return NextResponse.json({ error: `Failed to configure tunnel on destination nodes. Ensure they support ${type}.` }, { status: 500 });
        }

        const tunnel = await prisma.tunnel.create({
            data: {
                name: name || tunnelName,
                type,
                localIp,
                remoteIp,
                localNodeId,
                remoteNodeId,
                status: 'active'
            }
        });

        return NextResponse.json({ success: true, tunnel });
    } catch (err) {
        console.error('Create tunnel error:', err);
        return NextResponse.json({ error: 'Failed to save tunnel to database' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing tunnel ID' }, { status: 400 });

        const tunnel = await prisma.tunnel.findUnique({
            where: { id },
            include: { localNode: true, remoteNode: true }
        });

        if (!tunnel) return NextResponse.json({ error: 'Tunnel not found' }, { status: 404 });

        // Also attempt teardown (derive interface name or try generic cleanup)
        // For robust implementation, we would store interface names for teardown. 
        // Just deleting from DB for now as POC, but let's try to remove by name if it matches type+random pattern
        if (tunnel.name && (tunnel.name.startsWith('gre') || tunnel.name.startsWith('vxlan'))) {
            try {
                const cmdLocal = `ip link delete ${tunnel.name}`;
                const cmdRemote = `ip link delete ${tunnel.name}`;
                await Promise.all([
                    execSsh(tunnel.localNode.ip, tunnel.localNode.port, tunnel.localNode.username, tunnel.localNode.password || undefined, undefined, cmdLocal),
                    execSsh(tunnel.remoteNode.ip, tunnel.remoteNode.port, tunnel.remoteNode.username, tunnel.remoteNode.password || undefined, undefined, cmdRemote)
                ]);
            } catch (ignore) { }
        }

        await prisma.tunnel.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete tunnel error:', err);
        return NextResponse.json({ error: 'Failed to delete tunnel' }, { status: 500 });
    }
}
