package main

import (
	"log"
	"os"
	"os/exec"
)

func main() {
	cmd := exec.Command("node", "--loader", "tsx/esm", "js/build.ts")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("TypeScript build failed: %v", err)
	}

	log.Println("Build completed successfully!")
}
