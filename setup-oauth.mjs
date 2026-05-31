#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import axios from "axios";
import * as readline from "readline";

// Configuração
const projectRoot = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.join(projectRoot, ".env");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function readEnv() {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const config = {};
  content.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && key.trim()) {
      config[key.trim()] = valueParts.join("=").trim();
    }
  });
  return config;
}

function writeEnv(config) {
  const lines = Object.entries(config)
    .map(([key, value]) => `${key}=${value || ""}`)
    .join("\n");
  fs.writeFileSync(envPath, lines, "utf-8");
}

function validateClientId(clientId) {
  if (!clientId || clientId.length === 0) {
    return { valid: false, message: "❌ Client ID está vazio" };
  }
  if (!clientId.includes(".apps.googleusercontent.com")) {
    return {
      valid: false,
      message: "❌ Client ID deve ter formato: XXX.apps.googleusercontent.com",
    };
  }
  return { valid: true, message: "✅ Client ID válido" };
}

function validateSecret(secret) {
  if (!secret || secret.length === 0) {
    return { valid: false, message: "❌ Secret está vazio" };
  }
  if (secret.length < 20) {
    return { valid: false, message: "❌ Secret parece muito curto" };
  }
  return { valid: true, message: "✅ Secret válido" };
}

function validateRedirectUri(uri) {
  if (!uri || uri.length === 0) {
    return { valid: false, message: "❌ Redirect URI está vazio" };
  }
  try {
    new URL(uri);
    if (
      !uri.includes("auth/google/callback") &&
      !uri.includes("auth/callback")
    ) {
      return {
        valid: false,
        message: "❌ URI deve conter 'auth/google/callback' ou 'auth/callback'",
      };
    }
    return { valid: true, message: "✅ Redirect URI válido" };
  } catch {
    return { valid: false, message: "❌ URI não é uma URL válida" };
  }
}

function validateSessionSecret(secret) {
  if (!secret || secret.length === 0) {
    return { valid: false, message: "❌ Session secret está vazio" };
  }
  if (secret.length < 16) {
    return { valid: false, message: "❌ Session secret deve ter pelo menos 16 caracteres" };
  }
  return { valid: true, message: "✅ Session secret válido" };
}

function generateSessionSecret() {
  return crypto.randomBytes(32).toString("hex");
}

async function testGoogleConnection(clientId, secret) {
  try {
    await axios.post("https://oauth2.googleapis.com/token", {
      client_id: clientId,
      client_secret: secret,
      code: "invalid_code_for_test",
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:3000/auth/google/callback",
    });
    return { success: false, message: "⚠️ Resposta inesperada do Google" };
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    if (
      errorMessage === "invalid_grant" ||
      errorMessage === "invalid_code" ||
      errorMessage.includes("invalid")
    ) {
      return {
        success: true,
        message: "✅ Credenciais parecem válidas (teste com código inválido retornou erro esperado)",
      };
    }
    if (errorMessage.includes("invalid_client")) {
      return {
        success: false,
        message: "❌ Client ID ou Secret incorreto (invalid_client)",
      };
    }
    return { success: false, message: `❌ Erro ao conectar: ${errorMessage}` };
  }
}

async function main() {
  console.log("\n🔐 Google OAuth Config Manager for app-extrator");
  console.log("=".repeat(50));
  console.log();

  const config = readEnv();

  // Status atual
  console.log("📊 Status atual:\n");
  console.log(`  Client ID: ${config.GOOGLE_OAUTH_CLIENT_ID ? "✅ Configurado" : "❌ Vazio"}`);
  console.log(`  Secret: ${config.GOOGLE_OAUTH_CLIENT_SECRET ? "✅ Configurado" : "❌ Vazio"}`);
  console.log(
    `  Redirect URI: ${config.GOOGLE_OAUTH_REDIRECT_URI || "❌ Vazio"}`
  );
  console.log(
    `  Session Secret: ${config.GOOGLE_SESSION_SECRET ? "✅ Configurado" : "❌ Vazio"}`
  );
  console.log();

  // Pedir Client ID
  console.log("1️⃣  Client ID do Google Cloud Console");
  console.log("   (formato: XXXX.apps.googleusercontent.com)\n");
  let clientId = await question(
    `   Cole o Client ID [atual: ${config.GOOGLE_OAUTH_CLIENT_ID ? "***" : "vazio"}]: `
  );
  if (!clientId) clientId = config.GOOGLE_OAUTH_CLIENT_ID || "";

  const clientIdValidation = validateClientId(clientId);
  console.log(`   ${clientIdValidation.message}\n`);
  if (!clientIdValidation.valid) {
    rl.close();
    process.exit(1);
  }

  // Pedir Secret
  console.log("2️⃣  Client Secret do Google Cloud Console\n");
  let secret = await question(
    `   Cole o Client Secret [atual: ${config.GOOGLE_OAUTH_CLIENT_SECRET ? "***" : "vazio"}]: `
  );
  if (!secret) secret = config.GOOGLE_OAUTH_CLIENT_SECRET || "";

  const secretValidation = validateSecret(secret);
  console.log(`   ${secretValidation.message}\n`);
  if (!secretValidation.valid) {
    rl.close();
    process.exit(1);
  }

  // Pedir Redirect URI
  console.log("3️⃣  Redirect URI (padrão para development)\n");
  let redirectUri = await question(
    `   Cole o Redirect URI [atual: ${config.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3001/app-extrator/auth/google/callback"}]: `
  );
  if (!redirectUri)
    redirectUri =
      config.GOOGLE_OAUTH_REDIRECT_URI ||
      "http://localhost:3001/app-extrator/auth/google/callback";

  const redirectValidation = validateRedirectUri(redirectUri);
  console.log(`   ${redirectValidation.message}\n`);
  if (!redirectValidation.valid) {
    rl.close();
    process.exit(1);
  }

  // Session Secret
  console.log("4️⃣  Session Secret\n");
  let sessionSecret = config.GOOGLE_SESSION_SECRET;
  if (!sessionSecret) {
    sessionSecret = generateSessionSecret();
    console.log(
      `   ✨ Gerando novo Session Secret (aleatório)...\n   ${sessionSecret}\n`
    );
  } else {
    const sessionValidation = validateSessionSecret(sessionSecret);
    console.log(`   ${sessionValidation.message}\n`);
  }

  // Testar conexão
  console.log("5️⃣  Testando conexão com Google...\n");
  const testResult = await testGoogleConnection(clientId, secret);
  console.log(`   ${testResult.message}\n`);

  // Salvar
  console.log("6️⃣  Salvando configuração...\n");
  config.PUBLIC_GOOGLE_OAUTH_CLIENT_ID = clientId;
  config.GOOGLE_OAUTH_CLIENT_ID = clientId;
  config.GOOGLE_OAUTH_CLIENT_SECRET = secret;
  config.GOOGLE_OAUTH_REDIRECT_URI = redirectUri;
  config.GOOGLE_SESSION_SECRET = sessionSecret;
  writeEnv(config);
  console.log(`   ✅ Configuração salva em: ${envPath}\n`);

  // Resumo
  console.log("=".repeat(50));
  console.log("\n✨ Configuração concluída!\n");
  console.log("Próximos passos:");
  console.log("  1. Rode o servidor local:");
  console.log("     npm run dev:local\n");
  console.log("  2. Acesse http://localhost:3000/doc-md");
  console.log("  3. Clique em 'Conectar Google'\n");

  rl.close();
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  rl.close();
  process.exit(1);
});
