@ECHO OFF
robocopy "%cd%\alpha-stock" "c:\Alpha-Stock" /E /NFL /NDL

set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\Alpha Stock.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "c:\Alpha-Stock\alpha-stock.exe" >> %SCRIPT%
:: echo oLink.IconLocation = "c:\Alpha-Stock\resources\app\logo.png" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

PAUSE