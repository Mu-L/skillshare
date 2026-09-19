//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"golang.org/x/sys/unix"
	"golang.org/x/term"
)

func needsSudo(path string) bool {
	return unix.Access(filepath.Dir(path), unix.W_OK) != nil
}

// execFunc is the syscall used to replace the process. Overridden in tests.
var execFunc = unix.Exec

// stdinIsTTY reports whether a user can answer a sudo prompt. Overridden in tests.
var stdinIsTTY = func() bool { return term.IsTerminal(int(os.Stdin.Fd())) }

func reexecWithSudo(execPath string) error {
	sudoPath, err := exec.LookPath("sudo")
	if err != nil {
		return fmt.Errorf("sudo not found, please run: sudo %s", strings.Join(os.Args, " "))
	}
	args := []string{"sudo"}
	if !stdinIsTTY() {
		// sudo prompts on /dev/tty, not stdin: without -n a dashboard-spawned
		// upgrade waits for a password nobody can see until it times out.
		args = append(args, "-n")
	}
	args = append(args, execPath)
	args = append(args, os.Args[1:]...)
	return execFunc(sudoPath, args, os.Environ())
}
