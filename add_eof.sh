#!/bin/bash
for file in $(find src test -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx"); do
  if ! tail -5 "$file" | grep -q "// EOF"; then
    echo "Adding EOF to: $file"
    echo "" >> "$file"
    echo "// EOF" >> "$file"
  fi
done