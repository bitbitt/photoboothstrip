import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Testing Google Drive authentication methods...")

    // Check environment variables
    const requiredVars = [
      "GOOGLE_PROJECT_ID",
      "GOOGLE_PRIVATE_KEY_ID",
      "GOOGLE_PRIVATE_KEY",
      "GOOGLE_CLIENT_EMAIL",
      "GOOGLE_CLIENT_ID",
    ]

    const envStatus: any = {}
    const missing = []

    for (const envVar of requiredVars) {
      const value = process.env[envVar]
      if (!value) {
        missing.push(envVar)
        envStatus[envVar] = "MISSING"
      } else {
        envStatus[envVar] = envVar === "GOOGLE_PRIVATE_KEY" ? `SET (${value.length} chars)` : "SET"
      }
    }

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing environment variables: ${missing.join(", ")}`,
        envStatus,
      })
    }

    // Process private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY!

    console.log("🔑 Private key processing:")
    console.log("- Original length:", privateKey.length)
    console.log("- Has \\n sequences:", privateKey.includes("\\n"))
    console.log("- Has quotes:", privateKey.startsWith('"') || privateKey.endsWith('"'))

    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1)
    }

    const keyInfo = {
      hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
      length: privateKey.length,
      lines: privateKey.split("\n").length,
      firstLine: privateKey.split("\n")[0],
      lastNonEmptyLine: privateKey
        .split("\n")
        .filter((line) => line.trim())
        .slice(-1)[0],
    }

    console.log("🔍 Key validation:", keyInfo)

    const testResults: any = {
      envStatus,
      keyInfo: {
        hasBeginMarker: keyInfo.hasBeginMarker,
        hasEndMarker: keyInfo.hasEndMarker,
        length: keyInfo.length,
        lines: keyInfo.lines,
      },
      authMethods: {},
    }

    // Test Method 1: Direct JWT
    console.log("🧪 Testing Method 1: Direct JWT...")
    try {
      const jwtClient = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL!,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      })

      await jwtClient.authorize()
      const drive = google.drive({ version: "v3", auth: jwtClient })
      const aboutResponse = await drive.about.get({ fields: "user" })

      testResults.authMethods.directJWT = {
        success: true,
        user: aboutResponse.data.user?.emailAddress,
        method: "Direct JWT",
      }
      console.log("✅ Method 1: Success")
    } catch (error: any) {
      testResults.authMethods.directJWT = {
        success: false,
        error: error.message,
        method: "Direct JWT",
      }
      console.log("❌ Method 1: Failed -", error.message)
    }

    // Test Method 2: GoogleAuth with credentials
    console.log("🧪 Testing Method 2: GoogleAuth...")
    try {
      const credentials = {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID!,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID!,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL!)}`,
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      })

      const authClient = await auth.getClient()
      const drive = google.drive({ version: "v3", auth: authClient })
      const aboutResponse = await drive.about.get({ fields: "user" })

      testResults.authMethods.googleAuth = {
        success: true,
        user: aboutResponse.data.user?.emailAddress,
        method: "GoogleAuth with credentials",
      }
      console.log("✅ Method 2: Success")
    } catch (error: any) {
      testResults.authMethods.googleAuth = {
        success: false,
        error: error.message,
        method: "GoogleAuth with credentials",
      }
      console.log("❌ Method 2: Failed -", error.message)
    }

    // Test Method 3: fromJSON
    console.log("🧪 Testing Method 3: fromJSON...")
    try {
      const serviceAccountJson = {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID!,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID!,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL!)}`,
      }

      const auth = google.auth.fromJSON(serviceAccountJson)
      auth.scopes = ["https://www.googleapis.com/auth/drive.file"]

      const drive = google.drive({ version: "v3", auth })
      const aboutResponse = await drive.about.get({ fields: "user" })

      testResults.authMethods.fromJSON = {
        success: true,
        user: aboutResponse.data.user?.emailAddress,
        method: "fromJSON",
      }
      console.log("✅ Method 3: Success")
    } catch (error: any) {
      testResults.authMethods.fromJSON = {
        success: false,
        error: error.message,
        method: "fromJSON",
      }
      console.log("❌ Method 3: Failed -", error.message)
    }

    // Determine overall success
    const successfulMethods = Object.values(testResults.authMethods).filter((method: any) => method.success)
    const overallSuccess = successfulMethods.length > 0

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? `Google Drive authentication successful using ${successfulMethods.length} method(s)`
        : "All authentication methods failed",
      ...testResults,
      successfulMethods: successfulMethods.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Drive test failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Connection test failed",
        details: error.response?.data || null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
