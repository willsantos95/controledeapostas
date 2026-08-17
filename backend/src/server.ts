import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { ensureBucketExists } from "./config/s3";

const app = createApp();
const port = process.env.PORT || 4000;

ensureBucketExists().finally(() => {
  app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
  });
});
