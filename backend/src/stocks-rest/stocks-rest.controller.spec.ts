
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../app.module";

jest.setTimeout(30000);
describe("Stocks IDOR securite", () => {
  const logger = new Logger("StocksRestControllerSpec");
  let app: INestApplication;
  let cookie1: string;
  let cookie2: string;
  let stockId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const r1 = await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ phone: "+2250699000002", password: "TestPass123" });
    cookie1 = (r1.headers["set-cookie"] as unknown as string[])?.find(c => c.startsWith("access_token="))?.split(";")[0] || "";
    const r2 = await request(app.getHttpServer()).post("/api/v1/auth/login")
      .send({ phone: "+2250699000003", password: "TestPass123" });
    cookie2 = (r2.headers["set-cookie"] as unknown as string[])?.find(c => c.startsWith("access_token="))?.split(";")[0] || "";
  });

  afterAll(async () => { if (app) { try { await app.close(); } catch(e) { logger.error(e instanceof Error ? e.stack : String(e)); } } }, 20000);

  it("GET /stocks sans auth retourne 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/stocks").expect(401);
  });

  it("POST /stocks cree stock avec proprietaire_id", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/stocks").set("Cookie", cookie1)
      .send({ produit: "Test IDOR", quantite: 5, unite: "kg" }).expect(201);
    stockId = res.body.id;
    expect(res.body.proprietaire_id).toBeDefined();
  });

  it("PATCH /stocks/:id par autre marchand retourne 403", async () => {
    const res = await request(app.getHttpServer())
      .patch("/api/v1/stocks/" + stockId)
      .set("Cookie", cookie2)
      .send({ quantite: 999 });
    expect([403, 404]).toContain(res.status);
  });

  it("GET /catalogue retourne produits", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/catalogue").set("Cookie", cookie1).expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(15);
  });
});
