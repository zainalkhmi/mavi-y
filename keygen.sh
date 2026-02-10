#!/bin/bash

# Wrapper script to generate license keys easily
# Usage: ./keygen.sh [NAME] [ID]

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./keygen.sh [NAME] [ID]"
    echo "Example: ./keygen.sh ADMIN 001"
    exit 1
fi

node generate_license.js "$1" "$2"
