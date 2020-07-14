const config = require('./config.json');
config.start_regex = new RegExp(config.start_pattern);
config.stop_regex = new RegExp(config.stop_pattern);
//config.user_regex = new RegExp(config.user_pattern);

const { spawn } = require('child_process');

const app = require('express')();
const basicAuth = require('express-basic-auth');

const http = require('http').createServer(app);
const io = require('socket.io')(http);

function getLines(stream, cb) {
    let lines = '';
    stream.on('data', data => {
        lines += data.toString();
        let index;
        while((index = lines.indexOf('\n')) != -1) {
            let str = lines.substring(0, index + 1);
            lines = lines.substring(index + 1);

            cb(str);
        }
    });
}

var serverReady = false; // if the server is ready to accept players
var userOn = false;
/**
 * @type {ChildProcessWithoutNullStreams}
 */
var server = null; // null if there is no child process running
function startServer() {
    if(serverReady) 
        return 'The server is already running!';
    if(server != null)
        return 'The server is starting!';

    server = spawn(config.java_path, config.args, { cwd: config.server_path });
    io.emit('server', true);

    // show in the local window
    server.stdout.pipe(process.stdout);
    server.stderr.pipe(process.stderr);

    getLines(server.stdout, str => {
        if(str.match(config.start_regex)) {
            serverReady = true;
            io.emit('ready', true);
        } else if(str.match(config.stop_regex)) {
            serverReady = false;
            io.emit('ready', false);
        } //else if(str.match(config.user_regex)) {
            // TODO?: disallow stopping the server if a user is on
        //}

        io.emit('log', str); // send to everyone connected
    });

    getLines(server.stderr, str => {
        io.emit('log', data.toString()); // send to everyone connected
    });

    server.on('close', code => {
        serverReady = false;
        server = null;
        io.emit('server', false);
        console.log(`The server closed with code ${code}.`);
    });

    return 'Server started.';
}

function sendCommand(cmd) {
    if(!serverReady)
        return 'The server is not ready!';
    if(server == null)
        return 'The server is not on!';

    server.stdin.write(`${cmd}${cmd.endsWith('\n') ? '' : '\n'}`);
    if(cmd == 'stop') {
        server.stdin.end();
    }

    return 'Command sent.';
}

function getUnauthorizedResponse(req) {
    return req.auth
        ? ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected')
        : 'No credentials provided';
}

app.use(basicAuth({
    users: { [config.username]: config.password },
    challenge: true,
    unauthorizedResponse: getUnauthorizedResponse
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/logs', (req, res) => {
    res.sendFile(`${config.server_path}/logs/latest.log`);
});

app.post('/start', (req, res) => {
    res.status(200).send(startServer());
});

app.post('/stop', (req, res) => {
    res.status(200).send(sendCommand('stop'));
});

app.post('/status', (req, res) => {
    res.status(200).send(`${server != null}-${serverReady}`);
});

// app.post('/command', (req, res) => {
//     res.status(200).send(sendCommand(req.body.command));
// });

io.on('connection', socket => {
    console.log(`${socket.handshake.address} connected.`);

    // give user current data
    socket.emit('server', server != null);
    socket.emit('ready', serverReady);

    socket.on('start', () => socket.emit('info', startServer()));
    socket.on('stop',  () => socket.emit('info', sendCommand('stop')));
    socket.on('disconnect', () => {
        console.log(`${socket.handshake.address} disconnected.`);
    });
});

const TESTING = false;
http.listen(TESTING ? 3000 : config.port, '0.0.0.0', async () => {
    console.log("Listening");

    process.stdin.on('data', data => {
        sendCommand(data.toString());
    });
});