import { z } from "zod";

export const capabilitySchema = z
  .string()
  .transform((value) => value.trim().toLowerCase().replace(/\s+/g, "-"))
  .refine((value) => value.length >= 1 && value.length <= 32 && !value.includes(","), {
    message: "能力须为 1–32 个字符，不能含逗号",
  });
export type Capability = z.infer<typeof capabilitySchema>;
export const capabilitiesSchema = z
  .array(capabilitySchema)
  .transform((values) => [...new Set(values)]);

export const presetCapabilities = [
  { value: "coding", label: { zh: "写代码", en: "Coding" } },
  { value: "review", label: { zh: "代码审查", en: "Code review" } },
  { value: "testing", label: { zh: "测试", en: "Testing" } },
  { value: "browser", label: { zh: "浏览器操作", en: "Browser operation" } },
  { value: "docs", label: { zh: "写文档", en: "Documentation" } },
  { value: "data", label: { zh: "数据处理", en: "Data processing" } },
  { value: "design", label: { zh: "设计", en: "Design" } },
  { value: "devops", label: { zh: "部署运维", en: "Deployment and operations" } },
  { value: "macos", label: { zh: "运行在 Mac", en: "Runs on Mac" } },
  { value: "linux", label: { zh: "运行在 Linux", en: "Runs on Linux" } },
  { value: "windows", label: { zh: "运行在 Windows", en: "Runs on Windows" } },
  { value: "gpu", label: { zh: "有 GPU", en: "Has GPU" } },
];
