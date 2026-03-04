declare module "express" {
  import { Request, Response, Express } from "@types/express";
  export { Request, Response, Express };
  const express: Express;
  export default express;
}
