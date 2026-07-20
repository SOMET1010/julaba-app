
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { AppModule } from "../app.module";

jest.setTimeout(30000);
describe("Academy endpoints", () => {
  const logger = new Logger("AcademyControllerSpec");
  let app: INestApplication;
  let cookie: string;
  let moduleId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ phone: "+2250699000003", password: "TestPass123" });
    const cookies = res.headers["set-cookie"] as unknown as string[];
    cookie = cookies?.find(c => c.startsWith("access_token="))?.split(";")[0] || "";
  });

  afterAll(async () => { if (app) { try { await app.close(); } catch(e) { logger.error(e instanceof Error ? e.stack : String(e)); } } }, 20000);

  it("GET /academy/modules sans auth retourne 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/academy/modules").expect(401);
  });

  it("GET /academy/modules avec auth retourne modules", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/academy/modules").set("Cookie", cookie).expect(200);
    expect(res.body.modules.length).toBeGreaterThanOrEqual(1);
    moduleId = res.body.modules[0].id;
  });

  it("GET /academy/stats retourne stats", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/academy/stats").set("Cookie", cookie).expect(200);
    expect(res.body.totalModules).toBeGreaterThanOrEqual(1);
    expect(res.body.totalQuestions).toBeGreaterThanOrEqual(100);
  });

  it("POST enroll + PATCH progress + GET progress", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/academy/modules/" + moduleId + "/enroll")
      .set("Cookie", cookie).expect(201);
    const prog = await request(app.getHttpServer())
      .patch("/api/v1/academy/modules/" + moduleId + "/progress")
      .set("Cookie", cookie)
      .send({ taux_completion: 60, score: 80 }).expect(200);
    expect(prog.body.success).toBe(true);
    const get = await request(app.getHttpServer())
      .get("/api/v1/academy/modules/" + moduleId + "/progress")
      .set("Cookie", cookie).expect(200);
    expect(get.body.tauxCompletion).toBeDefined();
  });
});
