package main

import (
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "serve" {
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "hola desde Go en Docker\narch=%s os=%s\n", runtime.GOARCH, runtime.GOOS)
		})
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintln(w, "ok")
		})
		server := &http.Server{
			Addr:              ":8080",
			ReadHeaderTimeout: 5 * time.Second,
		}
		if err := server.ListenAndServe(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	fmt.Printf("hola desde Go en Docker\narch=%s os=%s\n", runtime.GOARCH, runtime.GOOS)
}
