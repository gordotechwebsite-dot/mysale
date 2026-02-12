Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

If fso.FileExists(scriptDir & "\biometric_tray.pyw") Then
    WshShell.Run "pythonw """ & scriptDir & "\biometric_tray.pyw""", 0, False
Else
    WshShell.Run "pythonw """ & scriptDir & "\biometric_server.py""", 0, False
End If
