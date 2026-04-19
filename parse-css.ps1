$cssFiles = Get-ChildItem -Path "src/styles" -Filter "*.css" -Recurse
$results = @()
foreach ($file in $cssFiles) {
    $lines = Get-Content $file.FullName
    $currentSelector = ""
    $currentMedia = ""
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        # Check for @media start
        if ($line -match '^\s*@media\s*[^{]+{') {
            $currentMedia = $line.Trim()
            continue
        }
        # Check for @media end (line contains '}')
        if ($currentMedia -ne "" -and $line -match '^\s*}') {
            $currentMedia = ""
            continue
        }
        # Check for selector line (ends with {)
        if ($line -match '^\s*(\.[^{]+)\s*{') {
            $currentSelector = $matches[1].Trim()
            continue
        }
        # Check for selector end (line contains '}')
        if ($currentSelector -ne "" -and $line -match '^\s*}') {
            $currentSelector = ""
            continue
        }
        # Check for border-radius properties
        if ($line -match '^\s*(border-(?:top-left|top-right|bottom-left|bottom-right)?-radius)\s*:\s*(.+?)\s*;') {
            $prop = $matches[1]
            $val = $matches[2].Trim()
            $result = [PSCustomObject]@{
                File = $file.FullName
                Line = $lineNum
                Selector = $currentSelector
                MediaQuery = $currentMedia
                Property = $prop
                Value = $val
            }
            $results += $result
        }
    }
}
$results | ConvertTo-Json
