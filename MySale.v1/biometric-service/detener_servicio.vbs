Set WshShell = CreateObject("WScript.Shell")

WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :8765 ^| findstr LISTENING') do taskkill /f /pid %a", 0, True
