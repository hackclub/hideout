<script lang="ts">
	type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'plain';
	let { text, tone = 'plain' }: { text: string; tone?: Tone; slam?: boolean } = $props();
</script>

<span class="chip {tone}">{text}</span>
