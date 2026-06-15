package org.omg.sysml.interactive;

public class SysMLWorkspaceDiagnostic {

    private final String uri;
    private final String severity;
    private final String message;
    private final Integer line;
    private final Integer column;
    private final Integer offset;
    private final Integer length;
    private final String code;

    public SysMLWorkspaceDiagnostic(
            String uri,
            String severity,
            String message,
            Integer line,
            Integer column,
            Integer offset,
            Integer length,
            String code) {
        this.uri = uri;
        this.severity = severity;
        this.message = message;
        this.line = line;
        this.column = column;
        this.offset = offset;
        this.length = length;
        this.code = code;
    }

    public String getUri() {
        return uri;
    }

    public String getSeverity() {
        return severity;
    }

    public String getMessage() {
        return message;
    }

    public Integer getLine() {
        return line;
    }

    public Integer getColumn() {
        return column;
    }

    public Integer getOffset() {
        return offset;
    }

    public Integer getLength() {
        return length;
    }

    public String getCode() {
        return code;
    }
}
