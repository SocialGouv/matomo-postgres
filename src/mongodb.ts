import * as mongoDB from "mongodb";
import { MONGO_URL, MONGO_DBNAME } from "./config";

const mongoClient: mongoDB.MongoClient = new mongoDB.MongoClient(MONGO_URL);

export const connectDB = () =>
    mongoClient.connect().catch(reason => {
        console.log("MONGO CONNECTION ERROR\n");
        console.error(reason);
        process.exit(1);
    });

export const client = mongoClient;

export default mongoClient.db(MONGO_DBNAME);

