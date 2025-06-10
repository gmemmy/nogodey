package main

import (
	"log"
	"os"
	"os/exec"

	"github.com/evanw/esbuild/pkg/cli"
)

func main() {
	cmd := exec.Command("node", "js/build.js")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("node build failed: %v", err)
	}
	
	// Equivalent to: node build.js --bundle --outfile=bundle.js
	os.Exit(cli.Run([]string{"build.js", "--bundle", "--outfile=bundle.js"}))
}
