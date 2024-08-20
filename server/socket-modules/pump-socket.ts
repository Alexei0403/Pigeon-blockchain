import { Server, Socket } from 'socket.io';
import { getGradiatedPumpList, getPumpList } from '../common/api';

class PumpSocket {
    private io: Server;
    private intervalId: NodeJS.Timeout | null = null;
    private isBusy: boolean = false;
    private room: string = 'pUmpRooM'

    constructor(io: Server) {
        this.io = io;
        this.startInterval();
        this.io.on('connection', this.onConnection.bind(this));
    }

    private onConnection(socket: Socket) {
        socket.join(this.room);
        socket.on('requestPumpList', async () => {
            await this.sendPumpList(new URLSearchParams(), new URLSearchParams());
        });

        socket.on('disconnect', () => {
            // Optionally handle cleanup if needed
        });
    }

    private async sendPumpList(filter_listing: URLSearchParams, filter_migrated: URLSearchParams) {
        try {
            this.isBusy = true;
            const [pumpList, migratedPumpList] = await Promise.allSettled([
                getPumpList(filter_listing),
                getGradiatedPumpList(filter_migrated)
            ]);
            const data: any = {};
            if (pumpList.status === 'fulfilled') {
                data.pump = pumpList.value;
            }
            if (migratedPumpList.status === 'fulfilled') {
                data.migrated = migratedPumpList.value;
            }
            this.io.to(this.room).emit('pumpList', data);
        } catch (error) {
            console.log(`Error@PumpSocket -> sendPumpList: ${error}`);
        } finally {
            this.isBusy = false;
        }
    }

    private startInterval() {
        this.intervalId = setInterval(async () => {
            if (!this.isBusy) {
                await this.sendPumpList(new URLSearchParams(), new URLSearchParams());
            }
        }, 5000);
    }

    public stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export default PumpSocket;