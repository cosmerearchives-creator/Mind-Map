#ifndef BuildNumber
#define BuildNumber "1"
#endif
#ifndef AppVersion
#define AppVersion "0.13.6"
#endif
[Setup]
AppId={{7D487C7E-2B7D-4F1A-AF1F-64A21437DE76}
AppName=Archives of Arcanum
AppVersion={#AppVersion}
DefaultDirName={autopf}\Silverlight
DefaultGroupName=Archives of Arcanum
OutputDir=output
OutputBaseFilename=Silverlight-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
CloseApplications=yes
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\Silverlight.exe
[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
[Icons]
Name: "{autoprograms}\Archives of Arcanum"; Filename: "{app}\Silverlight.exe"
Name: "{autodesktop}\Archives of Arcanum"; Filename: "{app}\Silverlight.exe"; Tasks: desktopicon
[InstallDelete]
Type: files; Name: "{autoprograms}\Silverlight.lnk"
Type: files; Name: "{autodesktop}\Silverlight.lnk"
[Tasks]
Name: desktopicon; Description: "Create desktop shortcut"; Flags: unchecked
[Run]
Filename: "{app}\Silverlight.exe"; Description: "Launch Archives of Arcanum"; Flags: nowait postinstall skipifsilent
