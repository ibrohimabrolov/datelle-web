import type { StaticImageData } from "next/image";
import gulnoza from "@/assets/img/vendor-gulnoza.jpg";
import oqsaroy from "@/assets/img/vendor-oqsaroy.jpg";
import lola from "@/assets/img/vendor-lola.jpg";
import navroz from "@/assets/img/vendor-navroz.jpg";
import zarafshon from "@/assets/img/vendor-zarafshon.jpg";
import bahor from "@/assets/img/vendor-bahor.jpg";
import evToy from "@/assets/img/event-toy.jpg";
import evQiz from "@/assets/img/event-qiz-uzatar.jpg";
import evTk from "@/assets/img/event-tugilgan-kun.jpg";
import evYub from "@/assets/img/event-yubiley.jpg";
import evKorp from "@/assets/img/event-korporativ.jpg";
import florist from "@/assets/img/florist.jpg";
import hero from "@/assets/img/hero.jpg";

/* Bundled photos addressable by key (the DB stores the key until uploads exist) */
export const IMAGES: Record<string, StaticImageData> = {
  "vendor-gulnoza": gulnoza, "vendor-oqsaroy": oqsaroy, "vendor-lola": lola, "vendor-navroz": navroz,
  "vendor-zarafshon": zarafshon, "vendor-bahor": bahor, "event-toy": evToy, "event-qiz-uzatar": evQiz,
  "event-yubiley": evYub, "event-korporativ": evKorp, "event-tugilgan-kun": evTk, florist, hero,
};
export const imageFor = (key: string) => IMAGES[key] ?? gulnoza;
