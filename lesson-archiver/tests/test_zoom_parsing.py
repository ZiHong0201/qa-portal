from archiver.zoom import ZoomClient, encode_uuid


def test_plain_uuid_is_single_encoded():
    assert encode_uuid("abc123==") == "abc123%3D%3D"


def test_uuid_with_slashes_is_double_encoded():
    # Zoom reads a single-encoded '/' as a path separator and 404s.
    assert encode_uuid("/abc/def==") == "%252Fabc%252Fdef%253D%253D"
    assert encode_uuid("ab//cd==").count("%25") > 0


MEETING = {
    "uuid": "abc==", "id": 123456, "topic": "Physics F5",
    "start_time": "2026-09-17T08:00:00Z", "duration": 90,
    "recording_files": [
        {"id": "v1", "file_type": "MP4", "recording_type": "shared_screen_with_speaker_view",
         "download_url": "https://zoom.us/rec/v", "file_size": 734003200, "status": "completed"},
        {"id": "a1", "file_type": "M4A", "recording_type": "audio_only",
         "download_url": "https://zoom.us/rec/a", "file_size": 41943040, "status": "completed"},
        {"id": "t1", "file_type": "TRANSCRIPT", "recording_type": "audio_transcript",
         "download_url": "https://zoom.us/rec/t", "file_size": 51200, "status": "completed"},
        {"id": "c1", "file_type": "CHAT", "recording_type": "chat_file",
         "download_url": "https://zoom.us/rec/c", "file_size": 2048, "status": "completed"},
    ],
}


def test_parse_picks_video_audio_and_transcript_only():
    rec = ZoomClient._parse_meeting(MEETING)
    assert rec.uuid == "abc=="
    assert rec.video_url.endswith("/v")
    assert rec.audio_url.endswith("/a")
    assert rec.transcript_url.endswith("/t")
    # Audio is the small file we fetch first: ~40 MB against ~700 MB of video.
    assert rec.audio_bytes < rec.video_bytes / 10
    assert rec.duration_minutes == 90


def test_parse_skips_meetings_with_no_media():
    empty = {**MEETING, "recording_files": [MEETING["recording_files"][3]]}
    assert ZoomClient._parse_meeting(empty) is None


def test_parse_skips_meetings_without_start_time():
    assert ZoomClient._parse_meeting({"uuid": "x", "recording_files": []}) is None


def test_incomplete_files_are_ignored():
    processing = {**MEETING, "recording_files": [
        {**MEETING["recording_files"][0], "status": "processing"},
        MEETING["recording_files"][1],
    ]}
    rec = ZoomClient._parse_meeting(processing)
    assert rec.video_url is None
    assert rec.audio_url is not None
