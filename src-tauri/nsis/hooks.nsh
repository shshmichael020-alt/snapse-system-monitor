; Snapse NSIS Custom Installer Hooks
; Ensures WebView2Loader.dll and libunwind.dll are installed next to snapse.exe for GNU/LLVM toolchain builds.

!macro NSIS_HOOK_PREINSTALL
  SetOutPath $INSTDIR
  File "${__FILEDIR__}\..\..\WebView2Loader.dll"
  File "${__FILEDIR__}\..\..\libunwind.dll"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\libunwind.dll"
!macroend
