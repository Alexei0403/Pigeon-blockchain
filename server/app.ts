import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './socket';
import cors from 'cors';
import { fetchTokenDetails, fetchTokenHolders } from './common/api';

const corsOptions: cors.CorsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-t-id']
};

const app = express();
app.use(cors(corsOptions));

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/', (req: Request, res: Response) => {
    res.send(req.headers['user-agent']);
});

app.get('/fetch-token-details', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const mint = req.query.mint as string | undefined;
    if (!mint) {
        res.status(400).json({ message: "Mint parameter is required", token_details: null });
        return;
    }
    const [tokenDetailsResult, holdersInfoResult] = await Promise.allSettled([
        fetchTokenDetails(mint),
        fetchTokenHolders(mint)
    ]);
    const tokenDetails = tokenDetailsResult.status === 'fulfilled'
        ? tokenDetailsResult.value
        : { error: 'Failed to fetch token details' };

    const holdersInfo = holdersInfoResult.status === 'fulfilled'
        ? holdersInfoResult.value
        : { error: 'Failed to fetch holders info' };
    res.json({
        message: "Success",
        token_details: {
            ...tokenDetails,
            holders_info: holdersInfo
        },
        mint
    });
}));

app.get('/fetch-token-holders', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const mint = req.query.mint as string | undefined;
    if (!mint) {
        res.status(400).json({ message: "Mint parameter is required", token_details: null });
        return;
    }
    const token_holders = await fetchTokenHolders(mint);
    res.json({ message: "Success", token_holders, mint });
}));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
});

setupSockets(io);

export default server;