import server from '../app';

const PORT = process.env.PORT || 3000;

async function beginServing() {
    server.listen(PORT,);
    server.on('error', console.log);
    server.on('listening', () => console.log(`Serving Express On Port: ${PORT}`));
    return "All Good"
}

beginServing().then(console.log).catch(console.error);