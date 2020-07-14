# auto-server
Creates a web page that allows anybody connected to start and stop a minecraft server.

**Requires a `config.json` file in the same directory as `index.js`.**

### config.json example
```json
{
    "port": 25566,
    "username": "admin",
    "password": "whatever works",
    "server_path": "path to server",
    "java_path": "path to java executable",
    "args": [
        "-server", "-Xms512M", "-Xmx1024M", "-XX:+UseG1GC", "-jar", "minecraft_server.1.16.1.jar", "nogui"
    ],
    "start_pattern": "\\[Server thread/INFO\\]: Done \\(.*s\\)! For help, type \"help\"",
    "stop_pattern": "\\[Server thread/INFO\\]: Stopping the server"
}
```