# Load border-radius data
$data = Get-Content "border-radius-data.json" -Raw | ConvertFrom-Json

# Group by value
$grouped = $data | Group-Object -Property Value

# Summary counts
$totalDeclarations = $data.Count
$distinctValues = $grouped.Count

# Prepare value details
$valueDetails = @()
foreach ($group in $grouped) {
    $value = $group.Name
    $entries = $group.Group
    $selectors = $entries.Selector | Sort-Object -Unique
    $sectionSelectors = $selectors | Where-Object { $_ -match "\.section_" -or $_ -match "-section" }
    $otherSelectors = $selectors | Where-Object { $_ -notmatch "\.section_" -and $_ -notmatch "-section" }
    $conditionalBackground = $selectors | Where-Object { $_ -match "background-color-white" }
    $mediaQuery = ($entries | Where-Object { $_.MediaQuery -ne "" } | Select-Object -First 1).MediaQuery -ne $null
    $valueDetails += [PSCustomObject]@{
        Value = $value
        Count = $entries.Count
        SectionSelectors = $sectionSelectors
        OtherSelectors = $otherSelectors
        ConditionalBackground = $conditionalBackground
        HasMediaQuery = $mediaQuery
    }
}

# Extract unique class names
$uniqueClassNames = @()
foreach ($entry in $data) {
    $selector = $entry.Selector
    $parts = $selector -split "\." | Where-Object { $_ -ne "" }
    foreach ($part in $parts) {
        $className = $part -replace "::.*$", "" -replace ":.*$", ""
        $uniqueClassNames += $className
    }
}
$uniqueClassNames = $uniqueClassNames | Sort-Object -Unique

# Search JSX files for class names
$jsxFiles = Get-ChildItem -Path "src/pages", "src/components" -Filter "*.jsx" -Recurse
$classUsage = @{}
foreach ($className in $uniqueClassNames) {
    $pattern = "className\s*=\s*['\""][^'\""]*\b$className\b"
    $matches = Select-String -Path $jsxFiles.FullName -Pattern $pattern -AllMatches
    if ($matches) {
        $classUsage[$className] = @($matches | ForEach-Object { $_.Path } | Sort-Object -Unique)
    }
}

# Output summary
Write-Output "=== BORDER-RADIUS USAGE SUMMARY ==="
Write-Output "Total declarations: $totalDeclarations"
Write-Output "Distinct values: $distinctValues"
Write-Output ""
Write-Output "=== VALUES GROUPED ==="
foreach ($vd in $valueDetails | Sort-Object { [decimal]($_.Value -replace '[^\d.]') } -Descending) {
    Write-Output "Value: $($vd.Value) (used $($vd.Count) times)"
    if ($vd.SectionSelectors) {
        Write-Output "  Section selectors: $($vd.SectionSelectors -join ', ')"
    }
    if ($vd.OtherSelectors) {
        Write-Output "  Other selectors: $($vd.OtherSelectors -join ', ')"
    }
    if ($vd.ConditionalBackground) {
        Write-Output "  Conditional background (background-color-white): $($vd.ConditionalBackground -join ', ')"
    }
    if ($vd.HasMediaQuery) {
        Write-Output "  Inside media query: Yes"
    }
    Write-Output ""
}
Write-Output "=== JSX CLASS USAGE (section-related classes) ==="
$sectionClasses = $uniqueClassNames | Where-Object { $_ -match "section_" -or $_ -match "-section" }
foreach ($className in $sectionClasses) {
    $files = $classUsage[$className]
    if ($files) {
        Write-Output "Class: $className"
        Write-Output "  Used in: $($files.Count) files"
        foreach ($file in $files) {
            Write-Output "    - $file"
        }
    }
}
