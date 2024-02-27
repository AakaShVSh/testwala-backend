const mongoose = require("mongoose");

module.exports = () => {
  return mongoose.connect(
    "mongodb://aakashvishwakarma059:veAY7D4e3WngFJif8uy8g897t6g8h76767rgr765677y5675r566rf6r5765d658477t67@ac-8shj5gx-shard-00-00.ckygyqe.mongodb.net:27017,ac-8shj5gx-shard-00-01.ckygyqe.mongodb.net:27017,ac-8shj5gx-shard-00-02.ckygyqe.mongodb.net:27017/?replicaSet=atlas-nf5o2g-shard-0&ssl=true&authSource=admin"
  );
};
