import { PeerServer } from "peer";

const port = process.env.PORT || 9000;

PeerServer({ port, path: "/peerjs" });

console.log(`PeerJS server running on port ${port}`);
