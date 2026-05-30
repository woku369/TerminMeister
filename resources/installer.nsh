; Stift Gurk Terminplanung NSIS Installer Script
; Professioneller Windows-Installer

; Zusätzliche Konfiguration für den Installer
!define PRODUCT_NAME "Stift Gurk Terminplanung"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Stift Gurk"
!define PRODUCT_WEB_SITE "https://www.stift-gurk.at"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\stift-gurk-terminplanung.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; Moderne UI verwenden
!include "MUI2.nsh"

; Installer-Design
!define MUI_HEADERIMAGE
!define MUI_WELCOMEFINISHPAGE_BITMAP_STRETCH "FitControl"

; Installer-Seiten
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "license.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller-Seiten
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Sprache
!insertmacro MUI_LANGUAGE "German"

; Installer-Einstellungen
Name "${PRODUCT_NAME}"
OutFile "StiftGurk-Terminplanung-Setup.exe"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

; Version-Info
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "Comments" "Professionelle Terminplanungs-Software für Führungen und Vor-Ort-Termine"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalTrademarks" ""
VIAddVersionKey "LegalCopyright" "© 2025 ${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Installer"
VIAddVersionKey "FileVersion" "1.0.0"

; Installer-Abschnitte
Section "Hauptprogramm" SEC01
  SectionIn RO
  SetOverwrite on
  
  ; Registry-Einträge erstellen
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\${PRODUCT_NAME}.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_NAME}.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoRepair" 1
  
  ; Uninstaller erstellen
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Desktop-Verknüpfung" SEC02
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe"
SectionEnd

Section "Startmenü-Verknüpfung" SEC03
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_NAME}.exe"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Deinstallieren.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

; Abschnittsbeschreibungen
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC01} "Installiert die Hauptprogramm-Dateien der Stift Gurk Terminplanung."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC02} "Erstellt eine Verknüpfung auf dem Desktop."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC03} "Erstellt Verknüpfungen im Startmenü."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller
Section Uninstall
  ; Registry-Einträge entfernen
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  
  ; Verknüpfungen entfernen
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Deinstallieren.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; Programm-Dateien entfernen
  RMDir /r "$INSTDIR"
  
  SetAutoClose true
SectionEnd

Function .onInit
  MessageBox MB_YESNO "Willkommen zur Installation der Stift Gurk Terminplanung!$\n$\nMöchten Sie fortfahren?" IDYES +2
  Abort
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Möchten Sie ${PRODUCT_NAME} wirklich vollständig entfernen?" IDYES +2
  Abort
FunctionEnd

; Installation
Section "Hauptprogramm" SEC01
  SetOutPath "$INSTDIR"
  
  ; Programmdateien
  File /r "${BUILD_RESOURCES_DIR}\*"
  
  ; Registry-Einträge
  WriteRegStr HKCU "Software\${PRODUCT_NAME}" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\${PRODUCT_NAME}" "Version" "${PRODUCT_VERSION}"
  
  ; Uninstaller erstellen
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; OneDrive-Setup
Section "OneDrive-Integration" SEC02
  ; OneDrive-Verzeichnis erstellen
  CreateDirectory "$PROFILE\OneDrive\StiftGurk"
  CreateDirectory "$PROFILE\OneDrive\StiftGurk\Terminplanung"
SectionEnd

; Desktop-Verknüpfung
Section "Desktop-Verknüpfung" SEC03
  CreateShortCut "$DESKTOP\Stift Gurk Terminplanung.lnk" "$INSTDIR\${PRODUCT_NAME}.exe"
SectionEnd

; Deinstallation
Section "Uninstall"
  Delete "$INSTDIR\*"
  RMDir "$INSTDIR"
  
  Delete "$DESKTOP\Stift Gurk Terminplanung.lnk"
  DeleteRegKey HKCU "Software\${PRODUCT_NAME}"
SectionEnd
