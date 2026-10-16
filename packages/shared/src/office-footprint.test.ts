import { expect, it } from "vitest";
import { fixture } from "./office-layout.fixture.ts";
import { parseOfficeLayout } from "./office-layout.ts";

it("requires a floor rear edge and ordered ground edges independent of sorting", () => {
  const value = fixture();
  expect(() =>
    parseOfficeLayout({ ...value, occluders: [{ ...value.occluders[0], floorTop: undefined }] }),
  ).toThrow();
  value.occluders[0].floorTop = 81;
  expect(() => parseOfficeLayout(value)).toThrow();
  value.occluders[0].floorBottom = 100;
  expect(parseOfficeLayout(value)).toEqual(value);
  value.occluders[0].floorBottom = 79;
  expect(() => parseOfficeLayout(value)).toThrow();
});
