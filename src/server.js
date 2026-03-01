const Port = process.env.Port || 80;
const app = require("./src/App");
const connect = require("./src/configs/db");

app.listen(Port,async (req,res) => {
    try {
        await connect();
        console.log("running on port",Port);
    } catch (error) {
        console.log(error);
    }
})