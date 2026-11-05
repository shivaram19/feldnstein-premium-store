package com.feldnstein.platform.marketing;

/**
 * LLM gateway port — the anti-corruption layer between the marketing service
 * and a text-generation provider (Ollama, or the built-in demo gateway).
 * {@code taskPrompt} is one of the supported marketing task names and
 * {@code contextJson} is the caller-supplied context map serialised to JSON.
 */
public interface LlmGateway {

    /** Generate marketing copy for the task, from the given JSON context. */
    String generate(String taskPrompt, String contextJson);
}
