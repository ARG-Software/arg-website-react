# Parse CSS files for border-radius declarations
$cssFiles = Get-ChildItem -Path "src/styles" -Filter "*.css" -Recurse
$borderRadiusData = @()
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
        # Check for border-radius properties (including shorthand)
        if ($line -match '^\s*(border-(?:top-left|top-right|bottom-left|bottom-right)?-radius|border-radius)\s*:\s*(.+?)\s*(!important)?\s*;') {
            $prop = $matches[1]
            $val = $matches[2].Trim()
            $important = $matches[3] -ne ""
            $borderRadiusData += [PSCustomObject]@{
                File = $file.FullName
                Line = $lineNum
                Selector = $currentSelector
                MediaQuery = $currentMedia
                Property = $prop
                Value = $val
                Important = $important
            }
        }
    }
}

# Group by value
$groupedByValue = $borderRadiusData | Group-Object -Property Value

# Prepare summary
$summary = [PSCustomObject]@{
    TotalDeclarations = $borderRadiusData.Count
    DistinctValues = $groupedByValue.Count
    Values = @()
}

# For each value group, collect details
foreach ($group in $groupedByValue) {
    $value = $group.Name
    $entries = $group.Group
    $selectors = $entries | Select-Object -ExpandProperty Selector -Unique
    $sectionSelectors = $selectors | Where-Object { $_ -match '\.section_' -or $_ -match '-section' }
    $otherSelectors = $selectors | Where-Object { $_ -notmatch '\.section_' -and $_ -notmatch '-section' }
    $conditionalBackground = $selectors | Where-Object { $_ -match 'background-color-white' }
    $valueObj = [PSCustomObject]@{
        Value = $value
        Count = $entries.Count
        SectionSelectors = $sectionSelectors
        OtherSelectors = $otherSelectors
        ConditionalBackground = $conditionalBackground
        MediaQuery = ($entries | Where-Object { $_.MediaQuery -ne "" } | Select-Object -First 1).MediaQuery -ne $null
    }
    $summary.Values += $valueObj
}

# Now search for JSX usage
$jsxFiles = Get-ChildItem -Path "src/pages", "src/components" -Filter "*.jsx" -Recurse
$classUsage = @{}
# Extract unique class names from selectors
$uniqueClassNames = @()
foreach ($entry in $borderRadiusData) {
    $selector = $entry.Selector
    # Split by '.' and skip empty
    $parts = $selector -split '\.' | Where-Object { $_ -ne "" }
    foreach ($part in $parts) {
        # Remove pseudo-classes (::before, :hover, etc.)
        $className = $part -replace '::.*$', '' -replace ':.*$', ''
        $uniqueClassNames += $className
    }
}
$uniqueClassNames = $uniqueClassNames | Select-Object -Unique

# Search for each class name in JSX files
foreach ($className in $uniqueClassNames) {
    $pattern = "className\s*=\s*[\\"''][^\\"'']*\b$className\b"
    $matches = Select-String -Path $jsxFiles.FullName -Pattern $pattern -AllMatches
    if ($matches) {
        $classUsage[$className] = @($matches | ForEach-Object { $_.Path })
    }
}

# Output summary
Write-Output "=== BORDER-RADIUS USAGE SUMMARY ==="
Write-Output "Total declarations: $($summary.TotalDeclarations)"
Write-Output "Distinct values: $($summary.DistinctValues)"
Write-Output ""
Write-Output "=== VALUES GROUPED ==="
foreach ($valObj in $summary.Values | Sort-Object { [decimal]($_.Value -replace '[^\d.]') } -Descending) {
    Write-Output "Value: $($valObj.Value) (used $($valObj.Count) times)"
    Write-Output "  Section selectors: $($valObj.SectionSelectors -join ', ')"
    Write-Output "  Other selectors: $($valObj.OtherSelectors -join ', ')"
    if ($valObj.ConditionalBackground) {
        Write-Output "  Conditional background (background-color-white): $($valObj.ConditionalBackground -join ', ')"
    }
    if ($valObj.MediaQuery) {
        Write-Output "  Inside media query: Yes"
    }
    Write-Output ""
}
Write-Output "=== JSX CLASS USAGE ==="
foreach ($className in $classUsage.Keys) {
    Write-Output "Class: $className"
    Write-Output "  Used in: $($classUsage[$className].Count) files"
    foreach ($file in $classUsage[$className]) {
        Write-Output "    - $file"
    }
}
