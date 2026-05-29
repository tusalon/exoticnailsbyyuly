$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$android = Join-Path $root "android"
$gradlew = Join-Path $android "gradlew.bat"

if (-not (Test-Path $gradlew)) {
    throw "No se encontro android\gradlew.bat. Ejecuta primero: npm run android:add"
}

Push-Location $android
try {
    & $gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle no pudo compilar la APK. Verifica que JDK y Android SDK esten instalados y que JAVA_HOME este configurado."
    }
} finally {
    Pop-Location
}

$apk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
    Write-Host "APK generada: $apk"
} else {
    throw "La compilacion termino pero no se encontro app-debug.apk"
}
